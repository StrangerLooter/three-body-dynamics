import struct
import json
import io
import os
import shutil
from PIL import Image

def optimize_glb(input_path, output_path, max_dim=1024, jpeg_quality=84):
    print(f"\nProcessing: {input_path}")
    orig_size = os.path.getsize(input_path)

    with open(input_path, 'rb') as f:
        data = f.read()

    magic, version, total_length = struct.unpack_from('<4sII', data, 0)
    assert magic == b'glTF', "Not a valid glTF file"

    chunk0_len, chunk0_type = struct.unpack_from('<II', data, 12)
    json_bytes = data[20:20 + chunk0_len]
    gltf = json.loads(json_bytes.decode('utf-8'))

    bin_chunk_offset = 20 + chunk0_len
    chunk1_len, chunk1_type = struct.unpack_from('<II', data, bin_chunk_offset)
    bin_data = data[bin_chunk_offset + 8 : bin_chunk_offset + 8 + chunk1_len]

    image_bv_map = {}
    for img_idx, img in enumerate(gltf.get('images', [])):
        bv_idx = img.get('bufferView')
        if bv_idx is not None:
            image_bv_map[bv_idx] = img_idx

    new_bv_data = []
    for bv_idx, bv in enumerate(gltf.get('bufferViews', [])):
        offset = bv.get('byteOffset', 0)
        length = bv['byteLength']
        raw_bytes = bin_data[offset : offset + length]

        if bv_idx in image_bv_map:
            img_idx = image_bv_map[bv_idx]
            img_obj = gltf['images'][img_idx]

            try:
                im = Image.open(io.BytesIO(raw_bytes))
                
                # Intelligent texture sizing
                cur_max = max_dim
                # For secondary channels like clouds, roughness, spec, 1024 or 512 is hyper-sharp
                if 'earth' in input_path.lower():
                    # Earth uses 4 quadrants, so 1024x1024 per quadrant gives 4096x2048 total sphere resolution!
                    cur_max = 1024
                elif 'mars' in input_path.lower():
                    cur_max = 1024
                elif 'sun' in input_path.lower():
                    cur_max = 1024

                if im.width > cur_max or im.height > cur_max:
                    im.thumbnail((cur_max, cur_max), Image.Resampling.LANCZOS)

                has_alpha = ('A' in im.mode or 'transparency' in im.info)
                
                if has_alpha:
                    # Optimize alpha texture (clouds / solar corona)
                    im_rgba = im.convert('RGBA')
                    # Quantize to adaptive 256 palette for 75% PNG compression without visual loss
                    im_quant = im_rgba.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
                    out_io = io.BytesIO()
                    im_quant.save(out_io, format='PNG', optimize=True)
                    compressed = out_io.getvalue()
                    
                    # If quantize is somehow larger than standard png, fallback to standard png
                    if len(compressed) > len(raw_bytes):
                        out_io = io.BytesIO()
                        im_rgba.save(out_io, format='PNG', optimize=True)
                        compressed = out_io.getvalue()
                        
                    img_obj['mimeType'] = 'image/png'
                    print(f"  [Image {img_idx}] PNG (alpha) {im.size}: {len(raw_bytes)/1024:.1f}KB -> {len(compressed)/1024:.1f}KB")
                else:
                    # Pure PBR surface texture (baseColor, normal, roughness, emissive)
                    im_rgb = im.convert('RGB')
                    out_io = io.BytesIO()
                    im_rgb.save(out_io, format='JPEG', quality=jpeg_quality, optimize=True)
                    compressed = out_io.getvalue()
                    img_obj['mimeType'] = 'image/jpeg'
                    print(f"  [Image {img_idx}] JPEG {im.size}: {len(raw_bytes)/1024:.1f}KB -> {len(compressed)/1024:.1f}KB")

                new_bv_data.append(compressed)
            except Exception as e:
                print(f"  [Image {img_idx}] Fallback keeping raw: {e}")
                new_bv_data.append(raw_bytes)
        else:
            new_bv_data.append(raw_bytes)

    # Reassemble BIN chunk with strict 4-byte alignment
    new_bin_buffer = bytearray()
    for bv_idx, bdata in enumerate(new_bv_data):
        align_pad = (4 - (len(new_bin_buffer) % 4)) % 4
        new_bin_buffer.extend(b'\x00' * align_pad)

        current_offset = len(new_bin_buffer)
        gltf['bufferViews'][bv_idx]['byteOffset'] = current_offset
        gltf['bufferViews'][bv_idx]['byteLength'] = len(bdata)
        new_bin_buffer.extend(bdata)

    align_pad = (4 - (len(new_bin_buffer) % 4)) % 4
    new_bin_buffer.extend(b'\x00' * align_pad)

    if 'buffers' in gltf and len(gltf['buffers']) > 0:
        gltf['buffers'][0]['byteLength'] = len(new_bin_buffer)

    new_json_str = json.dumps(gltf, separators=(',', ':'))
    new_json_bytes = new_json_str.encode('utf-8')
    json_pad = (4 - (len(new_json_bytes) % 4)) % 4
    new_json_bytes += b' ' * json_pad

    new_chunk0_header = struct.pack('<II', len(new_json_bytes), 0x4E4F534A)
    new_chunk1_header = struct.pack('<II', len(new_bin_buffer), 0x004E4942)

    total_glb_len = 12 + len(new_chunk0_header) + len(new_json_bytes) + len(new_chunk1_header) + len(new_bin_buffer)
    glb_header = struct.pack('<4sII', b'glTF', 2, total_glb_len)

    with open(output_path, 'wb') as f_out:
        f_out.write(glb_header)
        f_out.write(new_chunk0_header)
        f_out.write(new_json_bytes)
        f_out.write(new_chunk1_header)
        f_out.write(new_bin_buffer)

    new_size = os.path.getsize(output_path)
    savings = (1 - new_size / orig_size) * 100
    print(f"Result: {orig_size / (1024*1024):.2f} MB -> {new_size / (1024*1024):.2f} MB (Saved {savings:.1f}%)")

if __name__ == '__main__':
    models = [
        'public/models/earth_-_16k_high_resolution.glb',
        'public/models/mars.glb',
        'public/models/sun.glb'
    ]
    for m in models:
        tmp_output = m + '.opt'
        optimize_glb(m, tmp_output, max_dim=1024, jpeg_quality=84)
        shutil.move(tmp_output, m)
    print("\nAll 3D models optimized to ultra-fast loading specifications!")
